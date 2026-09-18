package com.iglesiadelacalle.sistemaiglesia.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.iglesiadelacalle.sistemaiglesia.models.SerDominical;

@Repository
public interface SerDominicalRepository extends JpaRepository<SerDominical, Integer> {
}