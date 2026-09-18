package com.iglesiadelacalle.sistemaiglesia.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.iglesiadelacalle.sistemaiglesia.models.Membresia;

@Repository
public interface MembresiaRepository extends JpaRepository<Membresia, Integer> {
}